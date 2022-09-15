



interface MyType {
    prop1: string,
    prop2: number,
    printName(): string
}



class User implements MyType {
    prop1 = ''
    prop2 = 123


    printName() {
        //logic
        return ''
    }

}

class Resource implements MyType {
    prop1 = ''
    prop2 = 123


    printName() {
        // logic
        //Different
        return ''
    }
}



