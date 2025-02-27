declare module 'tsne-js' {
  interface TSNEOptions {
    dim?: number
    perplexity?: number
    epsilon?: number
    iterations?: number
  }

  interface InitOptions {
    data: number[][]
    type: 'dense' | 'sparse'
  }

  export default class TSNE {
    constructor(options?: TSNEOptions)
    init(options: InitOptions): void
    run(): void
    step(): void
    getOutput(): number[][]
    getSolution(): number[][]
    getError(): number
    getIter(): number
  }
}
