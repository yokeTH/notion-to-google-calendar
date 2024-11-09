declare interface GoogleCalendarEvent {
	kind: string;
	etag: string;
	id: string;
	status: string;
	htmlLink: string;
	created: string;
	updated: string;
	summary: string;
	description?: string;
	location?: string;
	colorId?: string;
	creator: {
		id?: string;
		email: string;
		displayName?: string;
		self?: boolean;
	};
	organizer: {
		id?: string;
		email: string;
		displayName?: string;
		self?: boolean;
	};
	start: {
		date?: string;
		dateTime?: string;
		timeZone?: string;
	};
	end: {
		date?: string;
		dateTime?: string;
		timeZone?: string;
	};
	endTimeUnspecified?: boolean;
	recurrence?: string[];
	recurringEventId?: string;
	originalStartTime?: {
		date?: string;
		dateTime?: string;
		timeZone?: string;
	};
	transparency?: string;
	visibility?: string;
	iCalUID: string;
	sequence: number;
	attendees?: Array<{
		id?: string;
		email: string;
		displayName?: string;
		organizer?: boolean;
		self?: boolean;
		resource?: boolean;
		optional?: boolean;
		responseStatus: string;
		comment?: string;
		additionalGuests?: number;
	}>;
	attendeesOmitted?: boolean;
	extendedProperties?: {
		private?: { [key: string]: string };
		shared?: { [key: string]: string };
	};
	hangoutLink?: string;
	conferenceData?: {
		createRequest?: {
			requestId: string;
			conferenceSolutionKey?: {
				type: string;
			};
			status?: {
				statusCode: string;
			};
		};
		entryPoints?: Array<{
			entryPointType: string;
			uri: string;
			label?: string;
			pin?: string;
			accessCode?: string;
			meetingCode?: string;
			passcode?: string;
			password?: string;
		}>;
		conferenceSolution?: {
			key: { type: string };
			name: string;
			iconUri: string;
		};
		conferenceId?: string;
		signature?: string;
	};
	gadget?: {
		type: string;
		title: string;
		link: string;
		iconLink: string;
		width: number;
		height: number;
		display: string;
		preferences: { [key: string]: string };
	};
	anyoneCanAddSelf?: boolean;
	guestsCanInviteOthers?: boolean;
	guestsCanModify?: boolean;
	guestsCanSeeOtherGuests?: boolean;
	privateCopy?: boolean;
	locked?: boolean;
	reminders?: {
		useDefault: boolean;
		overrides?: Array<{
			method: string;
			minutes: number;
		}>;
	};
	source?: {
		url: string;
		title: string;
	};
	attachments?: Array<{
		fileUrl: string;
		title: string;
		mimeType: string;
		iconLink: string;
		fileId?: string;
	}>;
	eventType?: string;
}

declare interface DatabaseQueryResponse {
	object: string;
	results: ResultsItem[];
	next_cursor: null;
	has_more: boolean;
	type: string;
	page_or_database: Page_or_database;
	developer_survey: string;
	request_id: string;
}
interface ResultsItem {
	object: string;
	id: string;
	created_time: string;
	last_edited_time: string;
	created_by: Created_by;
	last_edited_by: Last_edited_by;
	cover: null;
	icon: null;
	parent: Parent;
	archived: boolean;
	in_trash: boolean;
	properties: Properties;
	url: string;
	public_url: null;
}
interface Created_by {
	object: string;
	id: string;
}
interface Last_edited_by {
	object: string;
	id: string;
}
interface Parent {
	type: string;
	database_id: string;
}
interface Properties {
	Notes: Notes;
	Tags: Tags;
	Description: Description;
	'Event ID': {
		id: string;
		type: string;
		rich_text: RichTextItem[];
	};
	'Last Update At': Last_Update_At;
	Courses: Courses;
	Date: Date_;
	Status: Status;
	Name: Name;
	Location: {
		id: string;
		type: string;
		rich_text: RichTextItem[];
	};
}
interface Notes {
	id: string;
	type: string;
	relation: RelationItem[];
	has_more: boolean;
}
interface RelationItem {
	id: string;
}
interface Tags {
	id: string;
	type: string;
	select: Select;
}
interface Select {
	id: string;
	name: string;
	color: string;
}
interface Description {
	id: string;
	type: string;
	rich_text: any[];
}
interface RichTextItem {
	type: string;
	text: Text;
	annotations: Annotations;
	plain_text: string;
	href: null;
}
interface Text {
	content: string;
	link: null;
}
interface Annotations {
	bold: boolean;
	italic: boolean;
	strikethrough: boolean;
	underline: boolean;
	code: boolean;
	color: string;
}
interface Courses {
	id: string;
	type: string;
	relation: RelationItem[];
	has_more: boolean;
}
interface Date_ {
	id?: string;
	type?: string;
	date?: {
		start?: string;
		end?: null | string;
		time_zone?: null;
	};
}
interface Status {
	id: string;
	type?: string;
	status?: Status;
	name?: string;
	color?: string;
}
interface Name {
	id: string;
	type: string;
	title: TitleItem[];
}
interface TitleItem {
	type: string;
	text: Text;
	annotations: Annotations;
	plain_text: string;
	href: null;
}
interface Page_or_database {}

interface Last_Update_At {
	id?: string;
	type?: string;
	date?: {
		start?: string;
		end?: null | string;
		time_zone?: null;
	};
}
