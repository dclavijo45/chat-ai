export interface IHistory {
    role: IHRole,
    parts: Part[]
}

export enum IHRole {
    user = 'user',
    model = 'model'
}

interface Part {
    text: string
}
