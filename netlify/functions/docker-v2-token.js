exports.handler = async function (event, context) {
    const fetch = await import('node-fetch');
    console.log(event);
    console.log(context);
    const scope = `repository:user/image:pull`;
    const tokenRes = await fetch.default(`https://ghcr.io/token?service=ghcr.io&scope=${scope}`);
    console.log(tokenRes)
    return {
        statusCode: 200,
        body: await tokenRes.text()
    };
}
