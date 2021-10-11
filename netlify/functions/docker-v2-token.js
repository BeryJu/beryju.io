exports.handler = async function (event, context) {
    const fetch = await import('node-fetch');
    const upstreamScope = event.queryStringParameters["scope"];
    const repo = upstreamScope.split(":");
    const scope = `repository:beryju/${repo}:pull`;
    const tokenRes = await fetch.default(`https://ghcr.io/token?service=ghcr.io&scope=${scope}`);
    console.log(tokenRes)
    return {
        statusCode: 200,
        body: await tokenRes.text()
    };
}
