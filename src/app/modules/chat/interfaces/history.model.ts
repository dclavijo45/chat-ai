export interface IHistory {
    role: IHRole,
    parts: PartHistory[]
}

export enum IHRole {
    user = 'user',
    model = 'model'
}

export interface PartHistory {
    type: TypePartEnum
    text: string
}

export enum TypePartEnum {
    text = 'text',
    image = 'image'
}
