import React, { useState, useEffect, useMemo } from "react";
import { Keypair, Transaction } from "@solana/web3.js";
import { findReference, FindReferenceError } from "@solana/pay";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { InfinitySpin } from "react-loader-spinner";
import IPFSDownload from "./IpfsDownload";

const STATUS = {
    Initial: "Intital",
    Submitted: "Submitted",
    Paid: "Paid",
};

export default function Buy ({ itemID }) {
    const { connection } = useConnection();
    const { publicKey, sendTransaction } = useWallet(); 
    const orderID = useMemo(() => Keypair.generate().publicKey, []);

    const [paid, setPaid] = useState(null);
    const [loading, setLoading] = useState(false);

    const order = useMemo(
        () => ({
            buyer: publicKey.toString(),
            orderID: orderID.toString(),
            itemID: itemID,
        }),
        [publicKey, orderID, itemID]
    );
    
    const processTransaction = async () => {
        setLoading(true);
        const txResponse = await fetch("../api/createTransaction", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(order),
        });
        const txData = await txResponse.json();

        const tx = Transaction.from(Buffer.from(txData.transaction, "base64"));
        console.log("Tx data is", tx);

        try {
            const txHash = await sendTransaction(tx, connection);
            console.log(`Transaction sent: https://solscan.io/tx/${txHash}?cluster=devnet`);
            setPaid(true);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (status === STATUS.Submitted) {
            setLoading(true);
            const interval = setInterval(async () => {
                try {
                    const result = await findReference(connection, orderID);
                    console.log("Finding tx reference", result.confirmationStatus);
                    if (result.confirmationStatus === "confirmed" || result.confirmationStatus === "finalized") {
                        clearInterval(interval);
                        setStatus(STATUS.Paid);
                        setLoading(false);
                        alert("Thank you for your purchase!");
                    }
                } catch (e) {
                    if (e instanceof FindReferencError) {
                        return null;
                    }
                    console.error("Unknown error", e);
                } finally {
                    setLoading(false);
                }
            }, 1000);
            return () => {
                clearInterval(interval);
            };
        }
    }, [status]);

    if (!publicKey) {
        return (
            <div>
                <p>You need to connect your wallet make transactions</p>
            </div>
        );
    }

    if (loading) {
        return <InfinitySpin color="gray" />
    }

    return (
        <div>
            {
               status === STATUS.Paid ? (
                    <IPFSDownload filename="emojis.zip" hash="QmWWH69mTL66r3H8P4wUn24t1L5pvdTJGUTKBqT11KCHS5" cta="Download emojis"/>
                ) : (
                    <button disabled={loading} className="buy-button" onClick={processTransaction}>
                         Buy now 🠚
                    </button>
            )}
        </div>
    );    
}