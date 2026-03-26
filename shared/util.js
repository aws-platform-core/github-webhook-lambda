export const API_TYPE_ENUM = {
    PR: "pull_request",
    JOBS: "jobs"
}

export const ORG_NAME_ENUM = {
    "aws-platform-core": "personal",
    "odido-aws-platform": "platform",
    "odido-enterprise-integration": "ei",
    "odido-portals": "portals"
}

export const EVENT_TYPE = {
    PULL_REQUEST: "pull_request",
    WORKFLOW_RUN: "workflow_run"
};

export const ACTION_TYPE = {
    REQUESTED: "requested",
    COMPLETED: "completed"
}

export const ORIGIN = {
    GITHUB: "github",
    ARGOCD: "argocd"
}

export const MESSAGES = {
    REL_ID_NOT_FOUND: "Release Id not found in PR title"
}

export const getRunEnvironment = (title) => {
    title = title.toLowerCase();
    if (title.includes("staging")) {
        return "staging";
    } else if (title.includes("prod")) {
        return "prod";
    } else if (title.includes("agile")) {
        return "agile";
    } else if (title.includes("test")) {
        return "test";
    } else {
        return "dev";
    }
}

export const getAppDomain = (orgName) => {
    return ORG_NAME_ENUM[orgName] || "unknown";
}