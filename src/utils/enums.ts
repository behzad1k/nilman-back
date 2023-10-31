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
  Canceled = 'Canceled',
  Done = 'Done'
};

export enum dataTypes {
  string = 'string',
  number = 'number',
  datetime = 'datetime',
  boolean = 'boolean',
  text = 'text',
  integer = 'integer'
}
