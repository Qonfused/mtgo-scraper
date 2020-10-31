import app from '../app'

describe('Environment', () => {
  it('runs without crashing', () => {
    const instance = app.listen(3000, () => instance.close())
  })
})
