import { Request, Response } from "express";
import { getRepository } from "typeorm";
import { validate } from "class-validator";
import config from "../config/config";
import { User } from "../entity/User";
import * as jwt from "jsonwebtoken";
import jwtDecode from "jwt-decode";
import {Address} from "../entity/Address";

class AddressController {
  static users = () => getRepository(User)

  static index = async (req: Request, res: Response): Promise<Response> => {
    const token: any = jwtDecode(req.headers.authorization);
    const id: number = token.userId;
    let user;
    try {
      user = await this.users().findOneOrFail({
        where: { id: id },
        relations: ['addresses']
      });
    }
    catch (error) {
      res.status(400).send({code: 400, data: "Invalid UserId"});
      return;
    }
    const addresses = user.addresses;
    return res.status(200).send({
      code: 200,
      data: addresses
    })
  }

  static create = async (req: Request, res: Response): Promise<Response> => {
    const { title, description, longitude, latitude, phoneNumber } = req.body;
    const token: any = jwtDecode(req.headers.authorization);
    const id: number = token.userId;
    let user;
    try {
      user = await this.users().findOneOrFail({
        where: { id: id },
        relations: ['addresses']
      });
    }
    catch (error) {

      res.status(400).send({code: 400, data: "Invalid UserId"});
      return;
    }
    const address = new Address();
    address.title = title;
    address.description = description;
    address.longitude = longitude;
    address.latitude = latitude;
    address.district = 1;
    address.phoneNumber = phoneNumber;
    address.userId = user.id;
    const errors = await validate(address);
    if (errors.length > 0) {
      return res.status(400).send(errors);
    }
    const addressRepository = getRepository(Address);
    try {
      await addressRepository.save(address);
    } catch (e) {
      return res.status(409).send({"code": 409});
    }
    return res.status(201).send({ code: 201, data: address});
  };

  static update = async (req: Request, res: Response): Promise<Response> => {
    const token: any = jwtDecode(req.headers.authorization);
    const userId: number = token.userId;
    const { addressId, title, description, longitude, latitude, phoneNumber, district } = req.body;
    const addressRepository = getRepository(Address);
    let address: Address, user: User;
    try {
      user = await this.users().findOneOrFail({
        where: { id: userId },
      });
    }
    catch (error) {
      res.status(400).send({code: 400, data: "Invalid UserId"});
      return;
    }
    try {
      address = await addressRepository.findOneOrFail(addressId);
    } catch (error) {
      return res.status(400).send({code: 400, data:"Invalid AddressId"});
    }
    if (address.userId !== user.id){
      return res.status(403).send({code: 403, data:"Access Forbidden"})
    }
    if (title)
      address.title = title;
    if (description)
      address.description = description;
    if (longitude)
      address.longitude = longitude;
    if (latitude)
      address.latitude = latitude;
    if (phoneNumber)
      address.phoneNumber = phoneNumber;
    if (district)
      address.district = district
    const errors = await validate(address);
    if (errors.length > 0) {
      return res.status(400).send(errors);
    }
    try {
      await addressRepository.save(address);
    } catch (e) {
      return res.status(409).send("error try again later");
    }
    return res.status(200).send({code: 400, data: address});
  };

  static delete = async (req: Request, res: Response): Promise<Response> => {
    const token: any = jwtDecode(req.headers.authorization);
    const userId: number = token.userId;
    const id: number = req.body.AddressId
    let user: User;
    try {
      user = await this.users().findOneOrFail({
        where: { id: userId },
        relations: ['addresses']
      });
    }
    catch (error) {
      res.status(400).send({code: 400, data: "Invalid UserId"});
      return;
    }
    const addressRepository = getRepository(Address);
    let address;
    try {
      address = await addressRepository.findOneOrFail({
        where: { id: id },
      });
    } catch (error) {
      res.status(400).send({code: 400, data:"Invalid Id"});
      return;
    }
    if (address.userId !== user.id){
      return res.status(403).send({code: 403, data:"Access Forbidden"})
    }
    try{
      await addressRepository.delete(id);

    }catch (e){
      res.status(409).send("error try again later");
    }
    return res.status(204).send();
  };

}

export default AddressController;
