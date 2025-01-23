import { AiEngineEnum } from "../enums/ai-engine.enum";
import { IHistory } from "./history.model";

export interface IChat {
    id: string,
    history: IHistory[],
    aiEngine: AiEngineEnum
}
