import {Request, Response} from "express";

interface Test {
    message: string;
}

interface TestResponse {
    response: string;
}

export const test = (req: Request<{}, {}, Test>, res: Response<TestResponse | { error: string }>): void => {
    const message = req.body.message;
    if (!message) {
        res.status(400).json({ error: "Message is required" });
        return;
    }
    console.log(`Message: ${message}`);
    res.status(200).json({ response: `Received message: \"${message}
     \"` });
}