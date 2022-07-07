const gitHubNamespace = "BeryJu";

exports.handler = async function (event, context) {
    const path = event.queryStringParameters.path;
    return {
        statusCode: 200,
        headers: {
            "content-type": "text/html",
        },
        body: `<meta name="go-import" content="${event.headers.host}${path} git https://github.com/${gitHubNamespace}${path}">`
    };
};
