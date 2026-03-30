export const API_TYPE_ENUM = {
    PR: "pull_request",
    JOBS: "jobs",
    WORKFLOW: "workflow",
    DIFF: "diff",
    DIFF_PR: "diff_PR"
}

export const ORG_NAME_ENUM = {
    "aws-platform-core": "personal",
    "odido-aws-platform": "platform",
    "odido-enterprise-integration": "ei",
    "odido-portals": "portals"
}

export const EVENT_TYPE = {
    PULL_REQUEST: "pull_request",
    WORKFLOW_RUN: "workflow_run",
    PUSH: "push",
};

export const ACTION_TYPE = {
    REQUESTED: "requested",
    COMPLETED: "completed",
    INPROGRESS: "in_progress"
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

export const COLORS = {
    STARTED:   '17A2B8', // blue
    SUCCESS:   '2CF5B6', // green
    FAILURE:   'FF2104', // red
    CANCELLED: 'FFC107'  // yellow
};

export const getDuration = (started_at, completed_at) => {
    const start = new Date(started_at);
    const end = new Date(completed_at);
    const duration = end - start;

    const minutes = Math.floor((duration % 3600000) / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);

    return `${minutes}m ${seconds}s`;
}

export const convertUTCToLocalTime = (utcDateString, timezone) => {
    const utcDate = new Date(utcDateString);
    const localDate = new Date(utcDate.getTime() + (new Date().getTimezoneOffset() * 60000));
    return localDate.toLocaleString("en-NL", { timeZone: timezone });
}