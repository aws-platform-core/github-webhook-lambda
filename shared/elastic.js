import axios from "axios";

export const postlogs = async (record, endpoint, key) => {
    console.log("Posting record to Elastic: ", record);
    console.log("Elastic endpoint: ", endpoint);
    console.log("Elastic API key: ", key ? "Provided" : "Not provided");
    try {
        const response = await axios.post(`${endpoint}`, JSON.stringify(record), {
            headers: {
                "Content-Type": "application/json",
                "Authorization": `ApiKey ${key}`
            }
        });
        console.log("Elastic response status: ", response.status);
        return response.data;
    } catch (error) {
        console.error("Failed posting events to elastic host: ", error);
        throw error;
    }
};
