import axios from 'axios';
import * as bcrypt from 'bcryptjs';
import { validate } from 'class-validator';
import { Request, Response } from 'express';
import moment from 'jalali-moment';
import jwtD from 'jwt-decode';
import { Between, getRepository, In } from 'typeorm';
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

    try {
      if (workerId) {
        return await this.handleSingleWorker(workerId, res);
      }
      return await this.handleMultipleWorkers(attributes, res);
    } catch (e) {
      console.log(e);
      return res.status(400).send({
        code: 400,
        data: 'Unexpected Error'
      });
    }
  };

  private static async handleSingleWorker(workerId: number, res: Response) {
    const worker = await this.users().findOne({
      where: { id: Number(workerId) },
      relations: { workerOffs: true },
      select: ['id', 'workerOffs']
    });

    if (!worker) {
      return res.status(400).send({ code: 400, data: 'Invalid WorkerId' });
    }

    const result = this.workerSchedule(worker.workerOffs);
    return res.status(200).send({ code: 200, data: result });
  }

  private static async handleMultipleWorkers(attributes: number[], res: Response) {
    const workers = await this.users().find({
      where: {
        role: roles.WORKER,
        status: 1,
        services: { id: In(attributes) }
      },
      relations: {
        workerOffs: true
      },
      select: ['id', 'workerOffs']
    });

    const result = this.calculateBusySchedule(workers);
    return res.status(200).send({ code: 200, data: result });
  }


  private static calculateBusySchedule(workers: User[]) {
    const startDate = moment().unix();
    const endDate = moment().add(37, 'days').unix();

    const workerOffsByDate = new Map<string, Map<number, Set<number>>>();
    const result: Record<string, number[]> = {};

    workers.forEach(worker => {
      worker.workerOffs
      .filter(off => {
        const offDate = moment(off.date, 'jYYYY/jMM/jDD').unix();
        return offDate >= startDate && offDate <= endDate;
      })
      .forEach(off => {
        if (!workerOffsByDate.has(off.date)) {
          workerOffsByDate.set(off.date, new Map());
        }
        const dateMap = workerOffsByDate.get(off.date)!;
        if (!dateMap.has(worker.id)) {
          dateMap.set(worker.id, new Set());
        }
        const timeSlots = this.getTimeSlots(off.fromTime, off.toTime);
        timeSlots.forEach(slot => dateMap.get(worker.id)!.add(slot));
      });
    });

    for (const [date, workersMap] of workerOffsByDate) {
      // Convert Sets to Arrays here
      const arrayWorkersMap = new Map<number, number[]>();
      workersMap.forEach((set, workerId) => {
        arrayWorkersMap.set(workerId, Array.from(set));
      });

      const commonBusyHours = this.findCommonBusyHours(arrayWorkersMap, workers.length);
      if (commonBusyHours.length > 0) {
        result[date] = commonBusyHours;
      }
    }

    return result;
  }




  private static getTimeSlots(fromTime: number, toTime: number): number[] {
    const slots = [];
    for (let i = 8; i < 20; i += 2) {
      if (
        (i >= fromTime && i < toTime) || // Slot starts within the off period
        (fromTime >= i && fromTime < i + 2) || // Off period starts within this slot
        (toTime > i && toTime < i + 2) || // Off period ends within this slot
        (fromTime <= i && toTime >= i + 2) // Slot is completely within off period
      ) {
        slots.push(i);
      }
    }
    return slots;
  }


  private static findCommonBusyHours(workersMap: Map<number, number[]>, totalWorkers: number): number[] {
    const hourCount = new Map<number, number>();

    // Count occurrences of each hour
    workersMap.forEach((timeSlots, workerId) => {
      timeSlots.forEach(hour => {
        hourCount.set(hour, (hourCount.get(hour) || 0) + 1);
      });
    });

    // A time slot is closed only if all workers are busy
    // Workers not in workersMap (empty workerOffs) are considered free
    return Array.from(hourCount.entries())
    .filter(([_, count]) => count === totalWorkers && count === workersMap.size)
    .map(([hour]) => hour);
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
