import { Request, Response } from "express";
import { getRepository } from "typeorm";
import { validate } from "class-validator";
import * as jwt from "jsonwebtoken";
import * as jwtDecode from "jwt-decode";
import { Address } from "../../entity/Address";

class AdminAddressController {

  static index = async (req: Request, res: Response): Promise<Response> => {
    const addressRepository = getRepository(Address);
    const addresses = addressRepository.find();
    return res.status(200).send({
      code: 200,
      data: addresses
    })
  }

  static create = async (req: Request, res: Response): Promise<Response> => {
    const { title, description, longitude, latitude, phoneNumber, userId } = req.body;
    const address = new Address();
    address.title = title;
    address.description = description;
    address.longitude = longitude;
    address.latitude = latitude;
    address.phoneNumber = phoneNumber;
    address.userId = userId;
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
    const { id, title, description, longitude, latitude, phoneNumber } = req.body;
    const addressRepository = getRepository(Address);
    let address: Address;
    try {
      address = await addressRepository.findOneOrFail(id);
    } catch (error) {
      return res.status(400).send({code: 400, data:"Invalid Id"});
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
    const id: number = req.body.id
    const addressRepository = getRepository(Address);
    try {
      await addressRepository.findOneOrFail(id);
    } catch (error) {
      return res.status(400).send({code: 400, data:"Invalid Id"});
    }
    try{
      await addressRepository.delete(id);

    }catch (e){
      res.status(409).send({code: 409, data: "error try again later"});
    }
    return res.status(204).send();
  };

}

export default AdminAddressController;
