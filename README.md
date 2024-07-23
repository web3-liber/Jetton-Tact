# Jetton-Tact

This project was created using blueprint and implements 0074-jettons-standard. The project's smart contract is implemented using Tact.

## Project structure

-   `contracts` - source code of all the smart contracts of the project and their dependencies.
-   `wrappers` - wrapper classes (implementing `Contract` from ton-core) for the contracts, including any [de]serialization primitives and compilation functions.
-   `tests` - tests for the contracts.
-   `scripts` - scripts used by the project, mainly the deployment scripts.

## How to Use

1. **Clone the Repository**:
    ```bash
    https://github.com/Liber-C/Jetton-Tact.git
    ```

2. **Navigate to the Project Directory**:
    ```bash
    cd Jetton-Tact
    ```

3. **Install Dependencies**:
    ```bash
    npm install
    ```

4. **Build the Contract**:
    ```bash
    npx blueprint build
    ```

5. **Test the Contract**:
    ```bash
    npx blueprint test
    ```

6. **Customize the Deploy Script**:
    - Open the `deployJettonInstance.ts` file.
    - Update the `name`, `description`, `symbol`, and `image` variables with your desired values.
    ```bash
    const jettonParams = {
        name: "Jetton Name",
        description: "A standard Instance for Jettons (TON fungible tokens).",
        symbol: "JN",
        image: "https://avatars.githubusercontent.com/u/104382459?s=200&v=4",
    };
    ```

7. **Deploy the Contract**:
    ```bash
    npx blueprint run
    ```

## Reference

1. [0074-jettons-standard](https://github.com/ton-blockchain/TEPS/blob/master/text/0074-jettons-standard.md)

## License

This project is licensed under the MIT License.
