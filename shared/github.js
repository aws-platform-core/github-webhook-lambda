import axios from "axios";
import { API_TYPE_ENUM } from "./util.js";

export const callGithubApi = async (payload, apiType, token) => {
    //https://api.github.com/repos/aws-platform-core/code-workflows/commits/b0e7107479ea94f34c4ca61a80a86016954165ce/pulls
    const url = `https://api.github.com/repos/${payload.workflow_run.repository.full_name}/${apiType === API_TYPE_ENUM.PR ? "commits/" + payload.workflow_run.head_sha + "/pulls" : "actions/runs/" + payload.workflow_run.id + "/jobs"}`;
    console.log("Api Endpoint: " + url);
    const response = await axios.get(url, {
        headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/vnd.github.v3+json"
        }
    });

    if (response.status !== 200) {
        throw new Error(`GitHub API error: ${response.statusText}`);
    }
    console.log("GitHub API response status: ", response.status);
    return response.data;
}