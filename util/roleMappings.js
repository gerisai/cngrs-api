function getRoleMappings (current) {
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
        path: new RegExp(String.raw`^(\/users\/${current})$`),
        verbs: ['GET','POST']
      },
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

  return roleMappings;
}

export default getRoleMappings;
