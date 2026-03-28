import axios from "axios";
import { API_TYPE_ENUM } from "./util.js";

export const callGithubApi = async (payload, apiType, token) => {

    let url = "https://api.github.com/repos/";
    switch (apiType) {
        case API_TYPE_ENUM.PR:
            url += `${payload.workflow_run.repository.full_name}/commits/${payload.workflow_run.head_sha}/pulls`;
            break;
        case API_TYPE_ENUM.JOBS:
            url += `${payload.workflow_run.repository.full_name}/actions/runs/${payload.workflow_run.id}/jobs`
            break;
        case API_TYPE_ENUM.WORKFLOW:
            url += `${payload.workflow_run.repository.full_name}/actions/workflows/${payload.workflow_run.workflow_id}/runs`;
            break;
        case API_TYPE_ENUM.DIFF:
            url += `${payload.workflow_run.repository.full_name}/commits/${payload.workflow_run.head_sha}`;
            break;
        default:
            throw new Error(`Unsupported API type: ${apiType}`);
    }

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
    console.log(`GitHub API response for ${apiType}: `, response.data);
    return response.data;
}