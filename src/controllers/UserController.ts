import axios from 'axios';
import * as bcrypt from 'bcryptjs';
import { validate } from 'class-validator';
import { Request, Response } from 'express';
import moment from 'jalali-moment';
import jwtD from 'jwt-decode';
import { getRepository } from 'typeorm';
import config from '../config/config';
import { Discount } from '../entity/Discount';
import Media from '../entity/Media';
import { User } from '../entity/User';
import { WorkerOffs } from '../entity/WorkerOffs';
import { dataTypes, roles } from '../utils/enums';
import { generateCode, jwtDecode, signJWT } from '../utils/funs';
import media from '../utils/media';
import sms from '../utils/smsLookup';

class UserController {
  static users = () => getRepository(User);
  static workerOffs = () => getRepository(WorkerOffs);

  static getUser = async (req: Request, res: Response): Promise<Response> => {
    const id = jwtDecode(req.headers.authorization);
    let user;
    try {
      user = await this.users().findOneOrFail({
        where: { id: id },
        relations: { profilePic: true }
      });
    } catch (e) {
      return res.status(400).send({
        'code': 400,
        'data': 'Invalid User'
      });
    }
    return res.status(200).send({
      'code': 200,
      'data': user
    });
  };
  static changePassword = async (req: Request, res: Response): Promise<Response> => {
    // Get ID from JWT
    const id = jwtDecode(req.headers.authorization);
    // Get parameters from the body
    const {
      oldPassword,
      newPassword
    } = req.body;
    if (!(oldPassword && newPassword)) {
      res.status(400).send();
    }

    // Get user from the database
    const userRepository = getRepository(User);
    let user: User;
    try {
      user = await userRepository.findOneOrFail({
        where: { id: id },
      });
    } catch (error) {
      res.status(401).send();
    }

    // Check if old password matchs
    // if (!user.checkIfUnencryptedPasswordIsValid(oldPassword)) {
    //   res.status(401).send("Invalid password or wrong email!");
    //   return;
    // }

    // Validate de model (password lenght)
    user.password = newPassword;
    const errors = await validate(user);
    if (errors.length > 0) {
      res.status(400).send(errors);
      return;
    }
    // Hash the new password and save
    // user.hashPassword();
    await userRepository.save(user);

    return res.status(204).send();
  };

  static update = async (req: Request, res: Response): Promise<Response> => {
    const id = jwtDecode(req.headers.authorization)

    let user;
    try {
      user = await this.users().findOneOrFail({
        where: { id: id },
      });
    } catch (e) {
      return res.status(400).send({
        code: 400,
        data: 'Invalid User'
      });
    }

    const {
      name,
      lastName,
      nationalCode,
      phoneNumber,
      birthday
    } = req.body;

    if (!name) {
      return res.status(400).send({
        code: 1002,
        data: 'Invalid name'
      });
    }

    if (!user.nationalCode && !nationalCode) {
      return res.status(400).send({
        code: 1003,
        data: 'Invalid National Code'
      });
    }
    if (!user.isVerified) {
      const res2 = await axios.post('https://ehraz.io/api/v1/match/national-with-mobile', {
        nationalCode: nationalCode,
        mobileNumber: user.phoneNumber
      }, {
        headers: {
          Authorization: 'Token 51ee79f712dd7b0e9e19cb4f35a972ade6f3f42f',
          'Content-type': 'application/json'
        }
      });

      if (!res2.data?.matched) {
        return res.status(400).send({
          code: 1005,
          data: 'کد ملی با شماره تلفن تطابق ندارد'
        });
      }
      console.log(birthday);
      // const res3 = await axios.post('https://ehraz.io/api/v1/info/identity-similarity', {
      //   nationalCode: nationalCode,
      //   birthDate: '1378/02/02',
      //   firstName: name,
      //   lastName: lastName,
      //   fatherName: 'بابک',
      //   fullName: name + ' ' + lastName
      // }, {
      //   headers: {
      //     Authorization: 'Token 51ee79f712dd7b0e9e19cb4f35a972ade6f3f42f',
      //     'Content-type': 'application/json'
      //   }
      // });
      // console.log(res3.data);
      // if (!res3.data?.matched) {
      //   return res.status(400).send({
      //     code: 1006,
      //     data: res3.data
      //   });
      // }
    }
    sms.referral(user.name + ' ' + user.lastName, user.code, user.phoneNumber);
    try {
      await getRepository(Discount).insert({
        userId: user.id,
        title: 'welcome',
        percent: 10,
        code: user.code,
        active: true,
        maxCount: 10,
      });
    } catch (e) {
      console.log(e);
      return res.status(409).send({ 'code': 409 });
    }

    user.name = name;
    user.lastName = lastName;
    user.nationalCode = nationalCode;
    user.phoneNumber = phoneNumber;
    user.birthday = birthday;
    user.isVerified = true;

    try {
      await this.users().save(user);

    } catch (e) {
      return res.status(409).send({ 'code': 409 });

    }


    return res.status(200).send({
      code: 200,
      user: user,
      token: await signJWT(user)
    });
  };
  static medias = async (req: Request, res: Response): Promise<Response> => {
    const userId = jwtDecode(req.headers.authorization);
    let user;
    try {
      user = await getRepository(User).findOneOrFail({
        where: { id: userId },
        relations: { profilePic: true }
      });
    } catch (error) {
      res.status(400).send({
        code: 400,
        data: 'Invalid UserId'
      });
      return;
    }
    if ((req as any).files) {
      const profileId = await media.create(req, (req as any).files[0], user.name, '/public/uploads/profilePic/');
      user.profileId = profileId;
      user.profilePic = await getRepository(Media).findOneBy({ id: profileId })
    }
    try {
      await this.users().save(user);
    } catch (e) {
      return res.status(409).send({ 'code': 409 , data: 'Unsuccessful'});
    }

    return res.status(200).send({
      code: '200',
      data: user
    });
  }
  static getAddresses = async (req: Request, res: Response): Promise<Response> => {
    const id = jwtDecode(req.headers.authorization);
    const userRepository = getRepository(User);
    let user;
    try {
      user = await userRepository.findOneOrFail({
        where: { id: id },
        relations: ['addresses']
      });
    } catch (error) {
      res.status(400).send({
        code: 400,
        data: 'Invalid UserId'
      });
      return;
    }
    return res.status(200).send({
      code: '200',
      data: user.addresses
    });
  };

  static getWorkerOffs = async (req: Request, res: Response): Promise<Response> => {
    const { attributes, workerId } = req.body;
    let result = {}
    if (workerId) {
      let worker: User;
      try {
        worker = await this.users().findOneOrFail({
          where: {
            id: Number(workerId),
            // services: { id: Number(id)}
          }, relations: { workerOffs: true }
        });
      } catch (e) {
        return res.status(400).send({
          code: 400,
          data: 'Invalid WorkerId'
        });
      }
      result = this.workerSchedule(worker.workerOffs);
    } else {
      try {
        const users = await this.users().find({
          where: {
            role: roles.WORKER,
            status: 1
          },
          relations: {
            services: true,
            workerOffs: true
          }
        });
        const workers = users.filter(e => attributes?.every(k => e.services?.map(e => e.id).includes(k)))
        console.log(workers.map(e => e.name + ' ' + e.lastName));
        for (let i = 0; i <= 30; i++) {
          const day = moment().add(i, 'day').format('jYYYY/jMM/jDD')
          const schedule = this.workersScheduleDay(workers, day)
          if (schedule.length > 0) {
            result[day] = schedule
          }
        }
      } catch (e) {
        console.log(e);
        return res.status(400).send({
          code: 400,
          data: 'Unexpected Error'
        });
      }
    }
    return res.status(200).send({
      code: 200,
      data: result
    });
  };

  private static workersScheduleDay = (workers: User[], day: string) => {
    const allWorkerOffs: any = {};
    for (const worker of workers) {
      const workerOffs = worker.workerOffs.filter(e => e.date == day);
      if (workerOffs.length > 0) {
        allWorkerOffs[worker.id] = Object.values(this.workerSchedule(workerOffs))[0];
      }
    }
    const result = [];
    for (let i = 8; i < 20; i = i + 2) {
      if (Object.values(allWorkerOffs).filter((e: any) => e.includes(i)).length == workers.length){
        result.push(i);
      }
    }
    return result;
  }

  private static workerSchedule = (workerOffs: WorkerOffs[]) => {
    let result: any = {};
    for (const workerOff of workerOffs) {
      if (!result[workerOff.date]){
        result[workerOff.date] = []
      }
      for (let i = 8; i < 20; i = i + 2) {
        if ((workerOff.fromTime >= i && workerOff.fromTime < (i + 2)) || (workerOff.fromTime <= i && workerOff.toTime >= (i))){
          result[workerOff.date].push(i);
          break;
        }else if((workerOff.fromTime >= i && workerOff.toTime <= (i + 2))){
          result[workerOff.date].push((i + 2));
          break;
        }
      }
    }
    return result;
  }

}

export default UserController;
