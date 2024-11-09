import { delay, makeGoogleAPIRequestWithRetry } from './google/serviceAuth';
import { queryDatabase } from './notion/queryDatabase';
import { updateNotionProperties } from './notion/updateNotionProperties';

export async function processTasks(env: Env) {
    try {
        const { NOTION_API_KEY, NOTION_TASKS_DATABASE_ID, GOOGLE_CALENDAR_ID } = env;
        const tasks = await queryDatabase(NOTION_TASKS_DATABASE_ID, NOTION_API_KEY);

        if (!tasks) {
            throw new Error('Database query failed');
        }

        const BATCH_SIZE = 5;
        const taskGroups = [];
        for (let i = 0; i < tasks.results.length; i += BATCH_SIZE) {
            taskGroups.push(tasks.results.slice(i, i + BATCH_SIZE));
        }

        for (const taskGroup of taskGroups) {
            await Promise.all(
                taskGroup.map(async (element) => {
                    try {
                        const eventId = element.properties['Event ID'].rich_text;
                        const eventIdText = eventId[0]?.plain_text || '';
                        const name = element.properties.Name.title[0]?.plain_text || 'Untitled';
                        const startDate = element.properties.Date.date?.start;
                        const endDate = element.properties.Date.date?.end;
                        const status = element.properties.Status.status?.name || '';
                        const inTrash = element.in_trash;
                        const lastUpdateAt = new Date(element.properties['Last Update At'].date?.start || 0);
                        const lastEditedTime = new Date(element.last_edited_time);
                        const location = element.properties.Location.rich_text[0]?.text.content;

                        if (Math.abs(lastEditedTime.getTime() - lastUpdateAt.getTime()) < 100) {
                            return;
                        }

                        if (!startDate) {
                            return;
                        }

                        const isDone = status.toLowerCase() === 'done';
                        const now = new Date();
                        let event;

                        // If both start and end dates exist, use original dates
                        if (endDate) {
                            event = {
                                summary: name,
                                start: startDate.length === 10 
                                    ? { date: startDate }
                                    : { dateTime: startDate },
                                end: endDate.length === 10 
                                    ? { date: endDate }
                                    : { dateTime: endDate },
                                location,
                            };
                        }
                        // For tasks with only start date
                        else {
                            // For all-day events
                            if (startDate.length === 10) {
                                const taskDate = new Date(startDate);
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);

                                if (isDone) {
                                    // Done task: Use original dates
                                    event = {
                                        summary: name,
                                        start: { date: startDate },
                                        end: { date: startDate },
                                        location,
                                    };
                                } else if (taskDate > today) {
                                    // Future task and not done: Start from today, end at original date
                                    event = {
                                        summary: name,
                                        start: { date: now.toISOString().split('T')[0] },
                                        end: { date: startDate },
                                        location,
                                    };
                                } else {
                                    // Past task and not done: Start from original, end today
                                    event = {
                                        summary: name,
                                        start: { date: startDate },
                                        end: { date: now.toISOString().split('T')[0] },
                                        location,
                                    };
                                }
                            } 
                            // For time-specific events
                            else {
                                const taskDateTime = new Date(startDate);
                                
                                if (isDone) {
                                    // Done task: Use original dates
                                    event = {
                                        summary: name,
                                        start: { dateTime: startDate },
                                        end: { dateTime: startDate },
                                        location,
                                    };
                                } else if (taskDateTime > now) {
                                    // Future task and not done: Start from now, end at original date/time
                                    event = {
                                        summary: name,
                                        start: { dateTime: now.toISOString() },
                                        end: { dateTime: startDate },
                                        location,
                                    };
                                } else {
                                    // Past task and not done: Start from original, end now
                                    event = {
                                        summary: name,
                                        start: { dateTime: startDate },
                                        end: { dateTime: now.toISOString() },
                                        location,
                                    };
                                }
                            }
                        }

                        const calendarUrl = `https://www.googleapis.com/calendar/v3/calendars/${GOOGLE_CALENDAR_ID}/events`;
                        
                        try {
                            let eventResponse: GoogleCalendarEvent;

                            if (!eventIdText) {
                                eventResponse = await makeGoogleAPIRequestWithRetry<GoogleCalendarEvent>(
                                    calendarUrl,
                                    'POST',
                                    env,
                                    event
                                );
                            } else if (!inTrash) {
                                eventResponse = await makeGoogleAPIRequestWithRetry<GoogleCalendarEvent>(
                                    `${calendarUrl}/${eventIdText}`,
                                    'PUT',
                                    env,
                                    event
                                );
                            } else {
                                eventResponse = await makeGoogleAPIRequestWithRetry<GoogleCalendarEvent>(
                                    `${calendarUrl}/${eventIdText}`,
                                    'DELETE',
                                    env
                                );
                            }

                            const updateProperties = {
                                'Event ID': {
                                    rich_text: [
                                        {
                                            type: 'text',
                                            text: {
                                                content: eventResponse?.id || '',
                                            },
                                        },
                                    ],
                                },
                                'Last Update At': {
                                    date: {
                                        start: new Date().toISOString(),
                                    },
                                },
                            };

                            await updateNotionProperties(updateProperties, element.id, NOTION_API_KEY);
                        } catch (e) {
                            const error = e as Error;
                            console.error(`Calendar API error for event ${name}:`, error.message);
                        }
                    } catch (e) {
                        const error = e as Error;
                        console.error(`Error processing task:`, error.message);
                    }
                })
            );

            await delay(1000);
        }
    } catch (e) {
        const error = e as Error;
        console.error('Process tasks error:', error.message);
        throw error;
    }
}