export async function queryDatabase(databaseId: string, apiKey: string) {
	// Fetch tasks from Notion database
	const tasksResponse = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
		method: 'post',
		headers: {
			Authorization: `Bearer ${apiKey}`,
			'Notion-Version': '2022-06-28',
			'Content-Type': 'application/json',
		},
	});

	if (!tasksResponse.ok) {
		console.error('Failed to fetch tasks from Notion', tasksResponse.statusText);
		return;
	}

	const tasks = (await tasksResponse.json()) as DatabaseQueryResponse;
	return tasks;
}