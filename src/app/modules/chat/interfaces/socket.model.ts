import { AiEngineEnum } from "../enums/ai-engine.enum";
import { IHistory } from "./history.model";

export interface IGlobalWSRequestResponse<T> {
    payload: T;
}

export interface IMessageWSRequest {
    /**
     * @description The list of messages exchanged between the user and the AI engine.
     */
    history: IHistory[];

    /**
     * @description The AI engine to be used.
     */
    aiEngine: AiEngineEnum;

    /**
     * @description The conversation ID of message.
     */
    conversationId: string;

    /**
     * @description The authentication token.
     */
    authToken: string;
}

export interface IMessageWSResponse {
    /**
     * @description The conversation ID.
     */
    conversationId: string;

    /**
     * @description Content part message.
     */
    messageChunk: string;

    /**
     * @description The state of the message.
     */
    state: StateMessageWSEnum;
}

export interface IPingPongPayloadRequest {
    /**
     * @description The ping message.
     */
    message: string;
}

export interface IAuthenticateWSRequest {
    /**
     * @description The authentication token.
     */
    authToken: string;
}

export interface IAuthenticateWSResponse {
    /**
     * @description Whether the user is authorized or not.
     */
    authorized: boolean;

    /**
     * @description The message of the authorization.
     */
    message: string;
}

export enum StateMessageWSEnum {
    START = 'start',
    STREAMING = 'streaming',
    END_STREAMING = 'end_streaming',
}
