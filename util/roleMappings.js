const roleMappings = {
  root: [{
    path: /\.*/,
    verbs: ['GET','PUT','POST','DELETE']
  }],
  admin: [
  {
    path: /^(\/users\/*)/,
    verbs: ['GET','PUT','POST','DELETE']
  },
  {
    path: /^(\/people\/*)/,
    verbs: ['GET','PUT','POST','DELETE']
  }
  ],
  operator: [
    {
      path: /^(\/users\/*)/,
      verbs: ['GET']
    },
    {
    path: /^(\/people\/*)/,
    verbs: ['GET','PUT','POST','DELETE']
    }
  ]
}

export default roleMappings;
