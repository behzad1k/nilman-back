import { Request, Response } from "express";
import { use } from 'passport';
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

  static basic = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const { userId, title, description, longitude, latitude, phoneNumber, postalCode, pelak, vahed } = req.body;
    const addressRepository = getRepository(Address);
    let address: Address;
    if (id) {
      try {
        address = await addressRepository.findOneOrFail({ where: { id: Number(id) } });
      } catch (error) {
        return res.status(400).send({
          code: 400,
          data: 'Invalid Id'
        });
      }
    }else{
      address = new Address();
      address.userId = userId;
    }

    address.title = title;
    address.description = description;
    address.phoneNumber = phoneNumber;
    address.postalCode = postalCode;
    address.vahed = vahed;
    address.pelak = pelak;
    address.longitude = longitude;
    address.latitude = latitude;

    const errors = await validate(address);
    if (errors.length > 0) {
      console.log(errors);
      return res.status(400).send(errors);
    }
    try {
      await addressRepository.save(address);
    } catch (e) {
      console.log(e);
      return res.status(409).send("error try again later");
    }
    return res.status(200).send({code: 200, data: address});
  };

  static delete = async (req: Request, res: Response): Promise<Response> => {
    const id: number = req.body.id
    const addressRepository = getRepository(Address);
    try {
      await addressRepository.findOneOrFail({
          where: { id: id },
        }
      );
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
