import type { Config, Context } from "https://edge.netlify.com";

const gitHubNamespace = "BeryJu";

export default (request: Request, context: Context): Response => {
    const path = new URL(request.url).searchParams.get("path");
    return new Response(
        `<meta name="go-import" content="${request.headers.get("host")}${path} git https://github.com/${gitHubNamespace}${path}">`,
        {
            status: 200,
            headers: {
                "content-type": "text/html",
                'cache-control': 'public, s-maxage=3600'
            }
        }
    )
};

export const config: Config = {
    path: "/functions/go-get",
    cache: "manual",
};
