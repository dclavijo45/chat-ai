import { IHistory } from "./history.model";

export interface IChat {
    id: string,
    history: IHistory[]
}
