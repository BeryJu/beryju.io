const config = {
    githubUserOrg: "beryju",
};

async function getToken(event) {
    const fetch = await import('node-fetch');
    const upstreamScope = event.queryStringParameters["scope"];
    const repo = upstreamScope.split(":");
    const scope = `repository:${config.githubUserOrg}/${repo}:pull`;
    const tokenRes = await fetch.default(`https://ghcr.io/token?service=ghcr.io&scope=${scope}`);
    return {
        statusCode: 200,
        body: await tokenRes.text()
    };
}

exports.handler = async function (event, context) {
    console.log(event);
    console.log(context);
    return {
        statusCode: 401,
        headers: {
            "www-authenticate": `Bearer realm="https://${event.headers.host}/token",service="${event.headers.host}",scope="repository:user/image:pull"`,
            "Docker-Distribution-API-Version": "registry/2.0",
            "content-type": "application/json",
        },
        body: JSON.stringify({})
    };
}
