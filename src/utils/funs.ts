import jwt from "jwt-decode";
import { Repository } from "typeorm";
import { dataTypes } from './enums';

export const getUserId = (token:string):number =>{
    const tokens: any = jwt(token);
    return tokens.userId
}

export const generateCode = (length = 6, type = dataTypes.number) => {
    const charset = type === dataTypes.number ? '0123456789' : 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let retVal = "";
    for (var i = 0, n = charset.length; i < length; ++i) {
        retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    return retVal;
}

export const getUniqueSlug = async (repository: Repository<any>, value:string, key = 'slug' ) => {
    let index = 1;
    let slug = value?.replaceAll(' ', '-');
    let where = {}
    where[key] = slug;
    try{
        while(await repository.findOne({
            where: where,
            withDeleted: true
        })){
            where[key] = slug + index;
            await repository.findOne({
                where: where
            });
            index = Number(index) + 1;
        }
    }catch (e){
        return value;
    }
    return where[key];
}

export const getUniqueCode = async (repository: Repository<any>) => {
    let code = generateCode(8, dataTypes.string);
    while(await repository.findOne({
        where: {
            code: code
        }
    })){
        code = generateCode(8, dataTypes.string);
    }
    return code;
}

export const omit = (keys, obj) => {
    if (!keys.length) return obj
    const { [keys.pop()]: omitted, ...rest } = obj;
    return omit(keys, rest);
}

export const getObjectValue = (object: any, value: any) => {
    try{
        return object[value]
    }catch (e){
        return
    }
}

export const jwtDecode  = (token) => {
    let userId;
    try {
        const decoded: any = jwt(token);
        if (decoded) {
            userId = decoded?.userId;
        }
    }catch (e){
        console.log(e, token);
    }
    return userId;
}


export const removeSpace = (value: string, replaceValue = '-') => value.replaceAll(' ', replaceValue);

export const isNumeric = (str: string) => {
    if (typeof str != "string") return false // we only process strings!
    return !isNaN(Number(str)) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
      !isNaN(parseFloat(str)) // ...and ensure strings of whitespace fail
}
