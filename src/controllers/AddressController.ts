import { Request, Response } from "express";
import { getRepository } from "typeorm";
import { validate } from "class-validator";
import config from "../config/config";
import { User } from "../entity/User";
import * as jwt from "jsonwebtoken";
import {Address} from "../entity/Address";
import { jwtDecode } from '../utils/funs';

class AddressController {
  static users = () => getRepository(User)

  static index = async (req: Request, res: Response): Promise<Response> => {
    const id = jwtDecode(req.headers.authorization);
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

  static basic = async (req: Request, res: Response): Promise<Response> => {
    const { title, description, longitude, latitude, phoneNumber, pelak, vahed, postalCode } = req.body;
    const { id } = req.params;
    const userId = jwtDecode(req.headers.authorization);
    let user;
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

    let address: Address;

    if (id){
      try {
        address = await getRepository(Address).findOneOrFail({ where: { id: Number(id) } });
      }catch (e){
        res.status(400).send({code: 400, data: "Invalid AddressId"});
      }
    } else {
      address = new Address();
      address.userId = user.id;
    }

    address.title = title;
    address.pelak = pelak;
    address.vahed = vahed;
    address.description = description;
    address.postalCode = postalCode;
    address.longitude = longitude;
    address.latitude = latitude;
    address.districtId = 1;
    address.phoneNumber = phoneNumber;

    const errors = await validate(address);
    if (errors.length > 0) {
      return res.status(400).send(errors);
    }
    try {
      await getRepository(Address).save(address);
    } catch (e) {
      console.log(e);
      return res.status(409).send({"code": 409, data: 'Unsuccessful'});
    }
    return res.status(201).send({ code: 200, data: address});
  };

  static update = async (req: Request, res: Response): Promise<Response> => {
    const userId = jwtDecode(req.headers.authorization);
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
      address.districtId = district
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
    const userId = jwtDecode(req.headers.authorization);
    const { id } = req.params
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
        where: { id: Number(id) },
      });
    } catch (error) {
      res.status(400).send({code: 400, data: "Invalid Id"});
      return;
    }
    if (address.userId !== user.id){
      return res.status(403).send({code: 403, data: "Access Forbidden"})
    }
    try{
      await addressRepository.softDelete({ id: Number(id) });

    }catch (e){
      console.log(e);
      res.status(409).send("error try again later");
    }
    return res.status(200).send({
      code: 200,
      data: 'Successful'
    });
  };

}

export default AddressController;
