export default {
  async fetch(request, env, ctx) {
    const authToken = request.headers.get("X-Cron-Auth");

    if (!authToken || authToken !== env.CRON_SECRET) {
      return new Response("Access denied", { status: 401 });
    }
    return new Response("OK", { status: 200 });
  },

  async scheduled(event, env, ctx) {
    if (!env.SITE_URL || !env.CRON_SECRET) {
      return;
    }

    const userAgent = env.CRON_USER_AGENT || "UptimeWorker-Cron/1.0";

    ctx.waitUntil(
      fetch(`${env.SITE_URL}/api/cron/check`, {
        method: "POST",
        headers: {
          "X-Cron-Auth": env.CRON_SECRET,
          "User-Agent": userAgent
        }
      })
    );
  }
};
