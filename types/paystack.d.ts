// This file declares the module type for the Paystack Inline JS library.
// It resolves the TypeScript error: "Could not find a declaration file for module '@paystack/inline-js'."

declare module '@paystack/inline-js' {
    // We declare a function that can be new'd up, which is how PaystackPop is used.
    // The actual types are usually more complex, but this simple declaration 
    // satisfies the TypeScript compiler and allows the build to proceed.
    export default class PaystackPop {
        newTransaction(options: any): void;
        // You can add more methods if you use them, but this is sufficient for the basic use case.
    }
}