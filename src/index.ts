import { processTasks } from './processTask';

export default {
    async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
        await processTasks(env);
    },

    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
        const url = new URL(request.url);
        if (url.pathname === '/trigger') {
            await processTasks(env);
            return new Response('Manual trigger processed', { status: 200 });
        }
        return new Response('Not found', { status: 404 });
    },
};