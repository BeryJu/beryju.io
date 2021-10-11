const fetch = require('node-fetch');

exports.handler = async function (event, context) {
    const scope = `scope="repository:user/image:pull"`;
    const tokenRes = await fetch(
        {
            url: `https://ghcr.io/token?service=ghcr.io&scope=${scope}`,
            method: "GET",
        }
    ).json()
    return {
        statusCode: 200,
        body: JSON.stringify(token)
    };
}
