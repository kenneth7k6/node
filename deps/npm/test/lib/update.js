const { resolve } = require('path')
const t = require('tap')
const requireInject = require('require-inject')

const noop = () => null
const npm = {
  globalDir: '',
  flatOptions: {
    depth: 0,
    global: false,
  },
  prefix: '',
}
const mocks = {
  npmlog: { warn () {} },
  '@npmcli/arborist': class {
    reify () {}
  },
  '../../lib/npm.js': npm,
  '../../lib/utils/reify-finish.js': noop,
  '../../lib/utils/usage.js': () => 'usage instructions',
}

t.afterEach(cb => {
  npm.prefix = ''
  npm.flatOptions.global = false
  npm.globalDir = ''
  cb()
})

t.test('no args', t => {
  t.plan(3)

  npm.prefix = '/project/a'

  class Arborist {
    constructor (args) {
      t.deepEqual(
        args,
        { ...npm.flatOptions, path: npm.prefix },
        'should call arborist contructor with expected args'
      )
    }

    reify ({ update }) {
      t.equal(update, true, 'should update all deps')
    }
  }

  const update = requireInject('../../lib/update.js', {
    ...mocks,
    '../../lib/utils/reify-finish.js': (arb) => {
      t.isLike(arb, Arborist, 'should reify-finish with arborist instance')
    },
    '@npmcli/arborist': Arborist,
  })

  update([], err => {
    if (err)
      throw err
  })
})

t.test('with args', t => {
  t.plan(3)

  npm.prefix = '/project/a'

  class Arborist {
    constructor (args) {
      t.deepEqual(
        args,
        { ...npm.flatOptions, path: npm.prefix },
        'should call arborist contructor with expected args'
      )
    }

    reify ({ update }) {
      t.deepEqual(update, ['ipt'], 'should update listed deps')
    }
  }

  const update = requireInject('../../lib/update.js', {
    ...mocks,
    '../../lib/utils/reify-finish.js': (arb) => {
      t.isLike(arb, Arborist, 'should reify-finish with arborist instance')
    },
    '@npmcli/arborist': Arborist,
  })

  update(['ipt'], err => {
    if (err)
      throw err
  })
})

t.test('update --depth=<number>', t => {
  t.plan(2)

  npm.prefix = '/project/a'
  npm.flatOptions.depth = 1

  const update = requireInject('../../lib/update.js', {
    ...mocks,
    npmlog: {
      warn: (title, msg) => {
        t.equal(title, 'update', 'should print expected title')
        t.match(
          msg,
          /The --depth option no longer has any effect/,
          'should print expected warning message'
        )
      },
    },
  })

  update([], err => {
    if (err)
      throw err
  })
})

t.test('update --global', t => {
  t.plan(2)

  const normalizePath = p => p.replace(/\\+/g, '/')
  const redactCwd = (path) => normalizePath(path)
    .replace(new RegExp(normalizePath(process.cwd()), 'g'), '{CWD}')

  npm.prefix = '/project/a'
  npm.globalDir = resolve(process.cwd(), 'global/lib/node_modules')
  npm.flatOptions.global = true

  class Arborist {
    constructor (args) {
      const { path, ...opts } = args
      t.deepEqual(
        opts,
        npm.flatOptions,
        'should call arborist contructor with expected options'
      )

      t.equal(
        redactCwd(path),
        '{CWD}/global/lib',
        'should run with expected prefix'
      )
    }

    reify () {}
  }

  const update = requireInject('../../lib/update.js', {
    ...mocks,
    '@npmcli/arborist': Arborist,
  })

  update([], err => {
    if (err)
      throw err
  })
})
