import { Inject } from "@nestjs/common";

export const DATABASE = Symbol("DATABASE");

export const InjectDatabase = () => Inject(DATABASE);
