import { Request } from "express";
import { FilterQuery, Types } from "mongoose";
import { IUser, UserModel } from "../models";

type OwnedDocument = {
  owner?: Types.ObjectId | null;
};

export async function loadRequestUser(req: Request): Promise<IUser | null> {
  if (!req.user?.id) {
    return null;
  }

  return UserModel.findById(req.user.id).exec();
}

export function buildAccountScope<T extends OwnedDocument>(
  user: IUser,
  filter: FilterQuery<T> = {}
): FilterQuery<T> {
  return {
    $and: [
      filter,
      { owner: user._id }
    ]
  } as FilterQuery<T>;
}

export function getOwnerPatch(user: IUser) {
  return { owner: user._id };
}
