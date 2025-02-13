import jwt from "jwt-decode";
import { Repository } from "typeorm";
import config from '../config/config';
import { Order } from '../entity/Order';
import { dataTypes } from './enums';
import * as jasonWebToken from 'jsonwebtoken';
import { createDecipheriv } from 'crypto';

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

export const signJWT = async (user: {
    id: any;
    role: any
}, exp?): Promise<string> => {
    const token = jasonWebToken.sign(
      {
          userId: user.id,
          role: user.role,
      },
      config.jwtSecret,
      {
          expiresIn: exp || config.expiration,
          issuer: config.issuer,
          audience: config.audience,
      },
    );

    return token;
};

export const signTmpJWT = async (user: {
    id: any;
    code: any
}, exp?): Promise<string> => {
    const token = jasonWebToken.sign(
      {
          userId: user.id,
          code: user.code,
      },
      config.jwtSecret,
      {
          expiresIn: exp || config.expiration,
          issuer: config.issuer,
          audience: config.audience,
      },
    );

    return token;
};


export const jwtDecode  = (token) => {
    let userId;
    try {
        const decoded: any = jwt(token);
        if (decoded) {
            userId = decoded?.userId;
        }
    }catch (e){
        console.log(e, token);
        return -1;
    }
    return userId;
}

export const getOrderTime = (order: Order) => {
    return order.orderServices.reduce((acc, cur) => acc + cur.service.section, 0)
}


export const removeSpace = (value: string, replaceValue = '-') => value.replaceAll(' ', replaceValue);

export const isEmpty = (value: any) => Object.values(value).length == 0;

export const isNumeric = (str: string) => {
    if (typeof str != "string") return false // we only process strings!
    return !isNaN(Number(str)) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
      !isNaN(parseFloat(str)) // ...and ensure strings of whitespace fail
}

export const decrypt = (
  encryptedText: string,
  key: string,
  iv: string
): string => {
    const keyBuffer = Buffer.from(key, 'base64');
    const ivBuffer = Buffer.from(iv, 'base64');

    const decipher = createDecipheriv(
      'aes-256-gcm',
      keyBuffer,
      ivBuffer
    );

    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}