import notesService from './notesService';

const services: Record<string, unknown> = {
  notesService,
  noteService: notesService,
  note: notesService,
};

export default services;
