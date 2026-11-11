import notesController from "./notesController";

const controllers: Record<string, unknown> = {
  notesController,
  noteController: notesController,
  note: notesController,
};

export default controllers;
