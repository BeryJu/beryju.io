const gitHubNamespace = "BeryJu";

exports.handler = async function (event, context) {
    return {
        statusCode: 200,
        headers: {
            "content-type": "text/html",
        },
        body: `<meta name="go-import" content="${event.headers.host}${event.path} git https://github.com/${gitHubNamespace}${event.path}.git">`
    };
}
