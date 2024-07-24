const roleMappings = {
  root: /\*/,
  admin: /^(\/user\/*|\/person\/*)/,
  operator: /^(\/person\/*)/
}

export default roleMappings;