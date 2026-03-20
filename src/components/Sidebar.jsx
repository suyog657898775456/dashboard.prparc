"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Users,
    HomeIcon,
    Briefcase,
    Eye,
    CircleHelp,
    Trophy,
    Book,
    Calendar,
    Contact,
    Activity,
    FileText,
    User,
    FileDown,
    NotebookTabs,
    CalendarDays,
    BookOpenCheck,
    TramFront,
    Image,
    UserCog
} from "lucide-react"

import NewsUpdates from "./NewsandNotices.jsx"
import AcademicEventsDashboard from "./AcademicEvents.jsx"
import TeachingStaffDashboard from "./TeachingStaff.jsx"

import Home from "./home.jsx"
import Siteframe from "./siteframe.jsx"
import Help from "./Helpcenter.jsx"
import FRA from "./FRA.jsx"
import NAAC from "./NAAC.jsx"
import Contacttab from "./contact.jsx"
import NewsNoticesDashboard from "./NewsNoticesDashBoard.jsx"
import AcademicCalendar from "./AcademicCalendar.jsx"
import Result from "./Result.jsx"
import Syllabus from "./Syllabus.jsx"
import Downloads from "./Downloads.jsx"
import ActivityFlyer from "./ActivityFlyer.jsx"
import CollegePhotos from "./CollegePhotos.jsx"
import CollegeTourDashboard from "./CollegeTour.jsx"
import ArchitecturalGallery from "./ArchitecturalGallery.jsx"
import NonTeachingStaffDashboard from "./NonTeachingStaff.jsx"

const sidebarItems = [
    { title: "Home", Icon: HomeIcon, Content: Home },
   
     { title: "FRA", Icon: FileText, Content: FRA },
     {
        title: "Faculty",
        Icon: Users,
        children: [
             { title: "Teaching Staff", Icon: User, Content: TeachingStaffDashboard },
             { title: "Non-Teaching Staff", Icon: User, Content: NonTeachingStaffDashboard },
            
        ],
    },
    {
        title: "Academics",
        Icon: Book,
        children: [
            { title: "Academic Calendar", Icon: Calendar, Content: AcademicCalendar },
            { title: "Syllabus", Icon: FileText, Content: Syllabus },
            { title: "Downloads", Icon: FileDown, Content: Downloads },
            { title: "Result", Icon: FileText, Content: Result },
            
        ],
    },

    {
        title: "Activities",
        Icon: NotebookTabs,
        children: [
            { title: "Academic Events", Icon: CalendarDays, Content: AcademicEventsDashboard },
            { title: "Activity Flyer", Icon: BookOpenCheck, Content: ActivityFlyer },
            { title: "College Tour", Icon: TramFront, Content: CollegeTourDashboard },
            { title: "College Photos", Icon:Image, Content: CollegePhotos },
            { title: "News and Notices", Icon: FileText, Content: NewsUpdates },
            { title: "Architectural Gallery", Icon: Image, Content: ArchitecturalGallery },
        ],
    },

    
    
  
    { title: "NAAC", Icon: UserCog, Content: NAAC },
   
   
  
    { title: "Help Center", Icon: CircleHelp, Content: Help },
]

function Sidebar({ isOpen: propIsOpen }) {
    const [activeContent, setActiveContent] = useState("Home")
    const [isMobile, setIsMobile] = useState(false)
    const [isOpen, setIsOpen] = useState(propIsOpen)
    const [expandedGroups, setExpandedGroups] = useState({})

    useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth < 768
            setIsMobile(mobile)
            if (mobile) setIsOpen(false)
        }

        checkMobile()
        window.addEventListener("resize", checkMobile)
        return () => window.removeEventListener("resize", checkMobile)
    }, [])

    useEffect(() => {
        if (!isMobile) setIsOpen(propIsOpen)
    }, [propIsOpen, isMobile])

    useEffect(() => {
        sidebarItems.forEach((item) => {
            if (item.children?.some((c) => c.title === activeContent)) {
                setExpandedGroups((prev) => ({ ...prev, [item.title]: true }))
            }
        })
    }, [activeContent])

    const getContent = (title) => {
        for (const item of sidebarItems) {
            if (item.title === title && item.Content) {
                return <item.Content setActiveContent={setActiveContent} />
            }
            if (item.children) {
                const child = item.children.find((c) => c.title === title)
                if (child) {
                    return <child.Content setActiveContent={setActiveContent} />
                }
            }
        }
        return null
    }

    const renderSidebarButton = (item, index, isChild = false) => {
        const isActive = activeContent === item.title
        const isGroup = item.children
        const isExpanded = expandedGroups[item.title]

        return (
            <motion.div
                key={index}
                className="relative"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
            >
                <button
                    onClick={() => {
                        if (isGroup) {
                            setExpandedGroups((p) => ({
                                ...p,
                                [item.title]: !p[item.title],
                            }))
                        } else {
                            setActiveContent(item.title)
                            if (isMobile) setIsOpen(false)
                        }
                    }}
                    className={`flex items-center max-w-full w-60 py-2 px-4 text-sm rounded-r-full transition-colors ${
                        isActive
                            ? "bg-blue-400/30 text-blue-950"
                            : "text-gray-700 hover:bg-gray-200"
                    } ${isOpen ? "justify-start space-x-2" : "justify-center"} ${
                        isChild ? "pl-6" : ""
                    }`}
                >
                    <item.Icon className="w-4 h-4 shrink-0" />

                    {isOpen && (
                        <>
                            <span className="flex-1 font-medium  text-left whitespace-nowrap">{item.title}</span>
                            {isGroup && (
                                <motion.span
                                    animate={{ rotate: isExpanded ? 90 : 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="text-xl"
                                >
                                    ▸
                                </motion.span>
                            )}
                        </>
                    )}
                </button>
            </motion.div>
        )
    }

    const renderMobileTab = (item, index) => {
        const isActive = activeContent === item.title

        return (
            <motion.div key={index} className="flex-shrink-0 px-2">
                <button
                    onClick={() => setActiveContent(item.title)}
                    className={`flex flex-col items-center py-2 ${
                        isActive ? "text-blue-800" : "text-gray-500"
                    }`}
                >
                    <item.Icon className="w-5 h-5 mb-1" />
                    <span className="text-xs truncate max-w-[4rem]">
                        {item.title}
                    </span>
                </button>
            </motion.div>
        )
    }

    return (
        <div className="relative h-full">
            {!isMobile && (
                <div className="flex h-[calc(100vh-5rem)]">
                    <motion.div
                        className="flex flex-col bg-white shadow-md pt-8"
                        animate={{ width: isOpen ? "16rem" : "5rem" }}
                    >
                        {sidebarItems.map((item, index) =>
                            item.children ? (
                                <div key={index} className="relative">
                                    {renderSidebarButton(item, index)}

                                    <AnimatePresence>
                                        {expandedGroups[item.title] &&
                                            isOpen && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{
                                                        opacity: 1,
                                                        height: "auto",
                                                    }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    // Add scrollbar only for Academics and Activities
                                                    className={item.title === "Academics" || item.title === "Activities" 
                                                        ? "overflow-y-auto overflow-x-hidden max-h-28" 
                                                        : ""}
                                                >
                                                    {item.children.map((child, cIndex) => (
                                                        <motion.div
                                                            key={cIndex}
                                                            initial={{ opacity: 0 }}
                                                            animate={{ opacity: 1 }}
                                                            exit={{ opacity: 0 }}
                                                        >
                                                            {renderSidebarButton(
                                                                child,
                                                                `${index}-${cIndex}`,
                                                                true
                                                            )}
                                                        </motion.div>
                                                    ))}
                                                </motion.div>
                                            )}
                                    </AnimatePresence>
                                </div>
                            ) : (
                                renderSidebarButton(item, index)
                            )
                        )}
                    </motion.div>

                    <div className="flex-1 overflow-y-auto bg-white">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeContent}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.2 }}
                            >
                                {getContent(activeContent)}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            )}

            {isMobile && (
                <div className="flex flex-col h-full">
                    <div className="flex-1 overflow-auto pb-16">
                        {getContent(activeContent)}
                    </div>

                    <motion.div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
                        <div className="flex overflow-x-auto no-scrollbar">
                            {sidebarItems
                                .flatMap((i) => (i.children ? i.children : i))
                                .map((item, index) =>
                                    renderMobileTab(item, index)
                                )}
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    )
}

export default Sidebar