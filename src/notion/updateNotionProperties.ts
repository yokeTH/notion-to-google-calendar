export async function updateNotionProperties(updateProperties: any, pageId: string, apiKey: string) {
	return await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
		method: 'PATCH',
		headers: {
			Authorization: `   ${apiKey}`,
			'Notion-Version': '2022-06-28',
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ properties: updateProperties }),
	});
}
