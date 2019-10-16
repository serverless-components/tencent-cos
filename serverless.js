const { Component, utils } = require('@serverless/core')
const { create, update, remove } = require('./utils')

class TencentCOS extends Component {
  async default(inputs = {}) {
    this.context.status('Deploying')

    await utils.sleep(2000)

    return {}
  }

  async remove() {
    this.context.status('Removing')

    await utils.sleep(2000)

    return {}
  }
}

module.exports = TencentCOS
