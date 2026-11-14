export class History {
  constructor(limit = 30) {
    this.limit = limit;
    this.stack = [];
    this.index = -1;
  }

  reset(state, label = 'Inicio') {
    this.stack = [{ state, label }];
    this.index = 0;
  }

  push(state, label = 'Cambio') {
    if (this.index < this.stack.length - 1) this.stack = this.stack.slice(0, this.index + 1);
    this.stack.push({ state, label });
    if (this.stack.length > this.limit) this.stack.shift();
    this.index = this.stack.length - 1;
  }

  get canUndo() { return this.index > 0; }
  get canRedo() { return this.index < this.stack.length - 1; }

  undo() {
    if (!this.canUndo) return null;
    this.index--;
    return { ...this.stack[this.index], label: this.stack[this.index + 1].label };
  }

  redo() {
    if (!this.canRedo) return null;
    this.index++;
    return { ...this.stack[this.index], label: this.stack[this.index].label };
  }

  current() {
    return this.stack[this.index] || null;
  }
}
