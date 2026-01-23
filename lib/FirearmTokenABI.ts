export const FirearmTokenABI = [
  {
    "inputs":[
      {"internalType":"string","name":"serial","type":"string"},
      {"internalType":"string","name":"make","type":"string"},
      {"internalType":"string","name":"model","type":"string"},
      {"internalType":"string","name":"caliber","type":"string"},
      {"internalType":"uint256","name":"dateBroughtIn","type":"uint256"},
      {"internalType":"string","name":"ownerId","type":"string"}
    ],
    "name":"mintFirearm",
    "outputs":[{"internalType":"uint256","name":"","type":"uint256"}],
    "stateMutability":"nonpayable",
    "type":"function"
  }
]
