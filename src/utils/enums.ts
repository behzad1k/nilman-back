export enum roles  {
  SUPER_ADMIN = 'SUPER_ADMIN',
  OPERATOR = 'OPERATOR',
  WORKER = 'WORKER',
  USER = 'USER',
};
export enum orderStatus  {
  Created = 'Created',
  Paid = 'Paid',
  Assigned = 'Assigned',
  InProgress = 'InProgress',
  Canceled = 'Canceled',
  Done = 'Done'
};
export enum orderStatusNames  {
  Created = 'سبد خرید',
  Paid = 'پرداخت شده',
  Assigned = 'محول شده',
  InProgress = 'در حال انجام',
  Canceled = 'کنسل شده',
  Done = 'تمام شده'
};

export enum dataTypes {
  string = 'varchar',
  number = 'number',
  datetime = 'datetime',
  boolean = 'boolean',
  text = 'text',
  integer = 'integer',
  float = 'float'
}
