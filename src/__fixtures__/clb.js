const clb = require('clb')

const buttonBuilder = clb({
  base: 'font-serif rounded-2xl',
  defaults: {
    color: 'gray',
  },
  variants: {
    color: {
      gray: props => ({
        'text-gray-800 bg-gray-800': !props.disabled,
        'text-gray-400 bg-gray-200': props.disabled,
      }),
      red: props => ({
        'text-red-800 bg-red-800': !props.disabled,
        'text-red-400 bg-red-200': props.disabled,
      }),
    },
    disabled: {
      true: 'cursor-not-allowed',
    },
  },
})

buttonBuilder()
