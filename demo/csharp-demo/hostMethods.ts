declare global {
    interface HostMethods {
        getConfig: { params: GetConfigParams; result: GetConfigResult };
        log: { params: LogParams; result: LogResult };
    }

    // getConfig
    interface GetConfigParams { }
    interface GetConfigResult {
        nodePort: number;
        retryCounts: number;
        clientAuthToken?: string;
    }

    // log
    interface LogParams {
        level: LogLevel;
        message: string;
    }
    type LogResult = void;

    type LogLevel = "debug" | "info" | "warning" | "error";
}

export { };
