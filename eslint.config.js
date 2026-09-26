import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import pluginOxlint from 'eslint-plugin-oxlint'

export default defineConfig([
  {
    name: 'app/files-to-lint',
    files: ['**/*.{vue,js,mjs,jsx}'],
  },

  globalIgnores([
    '**/dist/**',
    '**/dist-ssr/**',
    '**/coverage/**',
    // MSW 生成的 Service Worker 文件（第三方 vendored 代码），不参与本项目的 lint
    'public/mockServiceWorker.js',
  ]),

  {
    name: 'app/language-options',
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },

  js.configs.recommended,
  ...pluginVue.configs['flat/essential'],

  // 构建脚本与配置文件跑在 Node 环境里，需要 process 等 node 全局变量
  {
    name: 'app/node-context-files',
    files: ['scripts/**/*.{js,mjs}', '*.config.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },

  // 注意：flat config 是「后者覆盖前者」，所以自定义 rules 必须放在
  // js.configs.recommended / pluginVue.configs 之后，否则会被它们覆盖回去。
  //
  // src/views 下的一级文件是「路由页面」，命名由目录语义决定（index.vue），
  // 不存在可复用组件名冲突问题，因此只对页面关闭多词组件名规则；
  // src/components 下的可复用组件仍然强制多词命名。
  {
    name: 'app/views-component-name-exception',
    files: ['src/views/**/*.vue'],
    rules: {
      'vue/multi-word-component-names': 'off',
    },
  },

  // 关掉 oxlint 已经覆盖的 ESLint 规则，避免同一份代码被两套 linter 重复检查
  ...pluginOxlint.buildFromOxlintConfigFile('.oxlintrc.json'),
])
